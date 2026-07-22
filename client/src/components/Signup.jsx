import { Link } from 'react-router';
import { useGoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router';

const Signup = () => {
    const navigate = useNavigate();

    const login = useGoogleLogin({
        onSuccess: codeResponse => { console.log(codeResponse), navigate("/") },
        flow: 'auth-code',
    });

    return (
        <>
            <div className="relative py-3 sm:max-w-xl sm:mx-auto">
                <div className="relative px-4 py-10 bg-white mx-8 md:mx-0 shadow rounded-3xl sm:p-10">
                    <div className="w-full max-w-full px-3 mx-auto mt-0 md:flex-0 shrink-0">
                        <div className="relative z-0 flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
                            <div className="p-6 mb-0 text-center bg-white border-b-0 rounded-t-2xl">
                                <h5>Register with</h5>
                            </div>

                            {/* Restructured to use a semantic button element directly triggered */}
                            <div className="justify-center items-center max-w-full px-1 m-auto flex-0">
                                <button
                                    type="button"
                                    onClick={() => login()}
                                    className="inline-flex items-center justify-center w-full px-6 py-3 mb-4 font-bold text-center text-slate-700 uppercase align-middle transition-all bg-transparent border border-slate-300 border-solid rounded-lg shadow-sm cursor-pointer hover:scale-102 leading-pro text-xs ease-soft-in tracking-tight-soft hover:bg-slate-50"
                                >
                                    <svg xmlnsXlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 64 64" height="24px" width="24px" className="mr-2">
                                        <g fillRule="evenodd" fill="none" strokeWidth="1" stroke="none">
                                            <g fillRule="nonzero" transform="translate(3.000000, 2.000000)">
                                                <path fill="#4285F4" d="M57.8123233,30.1515267 C57.8123233,27.7263183 57.6155321,25.9565533 57.1896408,24.1212666 L29.4960833,24.1212666 L29.4960833,35.0674653 L45.7515771,35.0674653 C45.4239683,37.7877475 43.6542033,41.8844383 39.7213169,44.6372555 L39.6661883,45.0037254 L48.4223791,51.7870338 L49.0290201,51.8475849 C54.6004021,46.7020943 57.8123233,39.1313952 57.8123233,30.1515267"></path>
                                                <path fill="#34A853" d="M29.4960833,58.9921667 C37.4599129,58.9921667 44.1456164,56.3701671 49.0290201,51.8475849 L39.7213169,44.6372555 C37.2305867,46.3742596 33.887622,47.5868638 29.4960833,47.5868638 C21.6960582,47.5868638 15.0758763,42.4415991 12.7159637,35.3297782 L12.3700541,35.3591501 L3.26524241,42.4054492 L3.14617358,42.736447 C7.9965904,52.3717589 17.959737,58.9921667 29.4960833,58.9921667"></path>
                                                <path fill="#FBBC05" d="M12.7159637,35.3297782 C12.0932812,33.4944915 11.7329116,31.5279353 11.7329116,29.4960833 C11.7329116,27.4640054 12.0932812,25.4976752 12.6832029,23.6623884 L12.6667095,23.2715173 L3.44779955,16.1120237 L3.14617358,16.2554937 C1.14708246,20.2539019 0,24.7439491 0,29.4960833 C0,34.2482175 1.14708246,38.7380388 3.14617358,42.736447 L12.7159637,35.3297782"></path>
                                                <path fill="#EB4335" d="M29.4960833,11.4050769 C35.0347044,11.4050769 38.7707997,13.7975244 40.9011602,15.7968415 L49.2255853,7.66898166 C44.1130815,2.91684746 37.4599129,0 29.4960833,0 C17.959737,0 7.9965904,6.62018183 3.14617358,16.2554937 L12.6832029,23.6623884 C15.0758763,16.5505675 21.6960582,11.4050769 29.4960833,11.4050769"></path>
                                            </g>
                                        </g>
                                    </svg>
                                    <span>Google</span>
                                </button>
                            </div>

                            <div className="relative w-full max-w-full px-3 mt-2 text-center shrink-0">
                                <p className="z-20 inline px-4 mb-2 font-semibold leading-normal bg-white text-sm text-slate-400">or</p>
                            </div>
                        </div>

                        <div className="flex-auto p-6">
                            <form role="form text-left">
                                <div className="mb-4">
                                    <input aria-label="Name" placeholder="Name" className="text-sm focus:shadow-soft-primary-outline leading-5.6 ease-soft block w-full appearance-none rounded-lg border border-solid border-gray-300 bg-white bg-clip-padding py-2 px-3 font-normal text-gray-700 transition-all focus:border-fuchsia-300 focus:bg-white focus:text-gray-700 focus:outline-none focus:transition-shadow" type="text" />
                                </div>
                                <div className="mb-4">
                                    <input aria-label="Email" placeholder="Email" className="text-sm focus:shadow-soft-primary-outline leading-5.6 ease-soft block w-full appearance-none rounded-lg border border-solid border-gray-300 bg-white bg-clip-padding py-2 px-3 font-normal text-gray-700 transition-all focus:border-fuchsia-300 focus:bg-white focus:text-gray-700 focus:outline-none focus:transition-shadow" type="email" />
                                </div>
                                <div className="mb-4">
                                    <input aria-label="Password" placeholder="Password" className="text-sm focus:shadow-soft-primary-outline leading-5.6 ease-soft block w-full appearance-none rounded-lg border border-solid border-gray-300 bg-white bg-clip-padding py-2 px-3 font-normal text-gray-700 transition-all focus:border-fuchsia-300 focus:bg-white focus:text-gray-700 focus:outline-none focus:transition-shadow" type="password" />
                                </div>
                                <div className="min-h-6 pl-7 mb-0.5 block">
                                    <input defaultChecked={true} value="" type="checkbox" className="w-5 h-5 ease-soft -ml-7 rounded-1.4 checked:bg-gradient-to-tl checked:from-gray-900 checked:to-slate-800 after:duration-250 after:ease-soft-in-out duration-250 relative float-left mt-1 cursor-pointer appearance-none border border-solid border-slate-200 bg-white bg-contain bg-center bg-no-repeat align-top transition-all after:absolute after:flex after:h-full after:w-full after:items-center after:justify-center after:text-white after:opacity-0 after:transition-all checked:border-0 checked:border-transparent checked:bg-transparent checked:after:opacity-100" id="terms" />
                                    <label htmlFor="terms" className="mb-2 ml-1 font-normal cursor-pointer select-none text-sm text-slate-700"> I agree the <a className="font-bold text-slate-700">Terms and Conditions</a>
                                        <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 inline ml-1 fill-current text-green-500">
                                            <path d="M6.293 9.293a1 1 0 0 1 1.414 0L10 10.586l2.293-2.293a1 1 0 1 1 1.414 1.414l-3 3a1 1 0 0 1-1.414 0l-3-3a1 1 0 0 1 0-1.414z"></path>
                                        </svg>
                                    </label>
                                </div>

                                <div className="text-center">
                                    <button className="inline-block w-full px-6 py-3 mt-6 mb-2 font-bold text-center text-white uppercase align-middle transition-all bg-transparent border-0 rounded-lg cursor-pointer active:opacity-85 hover:scale-102 hover:shadow-soft-xs leading-pro text-xs ease-soft-in tracking-tight-soft shadow-soft-md bg-150 bg-x-25 bg-gradient-to-tl from-gray-900 to-slate-800 hover:border-slate-700 hover:bg-slate-700 hover:text-white" type="button">Sign up</button>
                                </div>
                                <p className="mt-4 mb-0 leading-normal text-sm">Already have an account? <Link className="font-bold text-slate-700" to='/login'>Sign in</Link></p>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Signup;